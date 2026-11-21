#!/usr/bin/env node
/**
 * Kiro PreToolUse hook: blocks the agent from writing secrets into this public repo.
 * Reads the hook event JSON from stdin. Exit 2 = block (stderr is shown to the agent).
 *
 * Blocks:
 *  - writes to .env / .env.* files (except .env.example)
 *  - content that looks like a real credential (GitHub, Shopify, AWS, Stripe, private keys)
 */

const SECRET_PATTERNS = [
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'GitHub token'],
  [/github_pat_[A-Za-z0-9_]{40,}/, 'GitHub fine-grained token'],
  [/shp(at|ss|ca|pa)_[a-fA-F0-9]{32}/, 'Shopify access token / secret'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
  [/sk_live_[0-9a-zA-Z]{24,}/, 'Stripe live secret key'],
  [/-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, 'private key'],
  [/xox[baprs]-[0-9A-Za-z-]{10,}/, 'Slack token'],
];

/** Collects string values of keys that look like file paths (path, targetFile, file_path, ...). */
function pathValues(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => pathValues(n, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string' && /path|file/i.test(k)) out.push(v);
      else pathValues(v, out);
    }
  }
  return out;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let text = input;
  let paths = [];
  try {
    const event = JSON.parse(input);
    text = JSON.stringify(event); // search the whole event, whatever its exact shape
    paths = pathValues(event);
  } catch {
    /* not JSON: scan raw text only */
  }

  const envTarget = paths.find((p) => /(^|[\\/])\.env(\.[\w.-]+)?$/.test(p) && !/\.env\.example$/.test(p));
  if (envTarget) {
    console.error(`Blocked: do not write ${envTarget} from the agent. Put placeholders in .env.example instead.`);
    process.exit(2);
  }

  for (const [re, label] of SECRET_PATTERNS) {
    if (re.test(text)) {
      console.error(`Blocked: content looks like a ${label}. Secrets must come from environment variables, never from files in this public repo.`);
      process.exit(2);
    }
  }
  process.exit(0);
});
