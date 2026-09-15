// Minimal ULID — Workers-safe (no crypto.getRandomValues polyfill needed in Workers runtime)
export function ulid(): string {
  const t = Date.now();
  const timeChars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let time = '';
  let ms = t;
  for (let i = 9; i >= 0; i--) {
    time = timeChars[ms % 32] + time;
    ms = Math.floor(ms / 32);
  }
  let rand = '';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) {
    rand += timeChars[b % 32];
  }
  return time + rand;
}
