/**
 * Verification: runs validation and optional smoke test.
 *
 * The smoke test is intentionally kept as a stub — full browser-based
 * smoke testing requires a running browser session and is better suited
 * to the `opencli test` command or CI pipelines.
 */

import { validateClisWithTarget, renderValidationReport } from './validate.js';

export async function verifyClis(opts: any): Promise<any> {
  const report = validateClisWithTarget([opts.builtinClis, opts.userClis], opts.target);
  return { ok: report.ok, validation: report, smoke: null };
}

export function renderVerifyReport(report: any): string {
  return renderValidationReport(report.validation);
}
