const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;

export function ulid(): string {
  const now = Date.now();
  let t = now;
  let timeStr = '';
  for (let i = 9; i >= 0; i--) {
    timeStr = ENCODING[t % ENCODING_LEN] + timeStr;
    t = Math.floor(t / ENCODING_LEN);
  }
  const randBytes = crypto.getRandomValues(new Uint8Array(16));
  let randStr = '';
  for (let i = 0; i < 16; i++) randStr += ENCODING[randBytes[i] % ENCODING_LEN];
  return timeStr + randStr;
}
