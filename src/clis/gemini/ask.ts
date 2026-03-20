import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';

export const askCommand = cli({
  site: 'gemini',
  name: 'ask',
  description: 'Send a message to Gemini and get response',
  domain: 'gemini.google.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'prompt', type: 'string', required: true },
    { name: 'timeout', type: 'int', default: 120 },
  ],
  columns: ['response'],
  func: async (page: IPage, kwargs: Record<string, any>) => {
    const prompt = kwargs.prompt as string;
    const timeoutMs = ((kwargs.timeout as number) || 120) * 1000;

    await page.goto('https://gemini.google.com/app');
    await page.wait(3);

    const promptJson = JSON.stringify(prompt);

    const sendResult = await page.evaluate(`(async () => {
      try {
        const ce = document.querySelector('div[contenteditable="true"]')
          || document.querySelector('.ql-editor[contenteditable="true"]');
        const ta = document.querySelector('textarea');
        const input = ce || ta;
        if (!input) return { ok: false, msg: 'no input found' };
        input.focus();
        if (ce) {
          ce.textContent = '';
          document.execCommand('insertText', false, ${promptJson});
        } else {
          ta.value = '';
          document.execCommand('selectAll');
          document.execCommand('insertText', false, ${promptJson});
        }
        await new Promise(r => setTimeout(r, 800));
        const btn = document.querySelector('button.send-button')
          || document.querySelector('button[aria-label="Send message"]')
          || document.querySelector('button[mattooltip="Send"]')
          || [...document.querySelectorAll('button')].find(b =>
            !b.disabled && b.querySelector('mat-icon, svg'));
        if (btn && !btn.disabled) { btn.click(); return { ok: true }; }
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        return { ok: true, msg: 'enter' };
      } catch (e) { return { ok: false, msg: e.toString() }; }
    })()`);

    if (!sendResult?.ok) {
      return [{ response: '[SEND FAILED] ' + JSON.stringify(sendResult) }];
    }

    const startTime = Date.now();
    let lastText = '';
    let stableCount = 0;

    while (Date.now() - startTime < timeoutMs) {
      await page.wait(3);
      const response = await page.evaluate(`(() => {
        const turns = document.querySelectorAll('model-response, .model-response-text, [class*="response-container"]');
        if (turns.length) {
          const last = turns[turns.length - 1];
          return (last.innerText || '').trim();
        }
        const msgs = [...document.querySelectorAll('message-content, [class*="message"]')];
        const last = msgs[msgs.length - 1];
        return last ? (last.innerText || '').trim() : '';
      })()`);

      if (response && response.length > 2) {
        if (response === lastText) {
          stableCount++;
          if (stableCount >= 2) return [{ response }];
        } else {
          stableCount = 0;
        }
      }
      lastText = response || '';
    }

    if (lastText) return [{ response: lastText }];
    return [{ response: '[NO RESPONSE]' }];
  },
});
