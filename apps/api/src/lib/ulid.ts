const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

export function ulid(): string {
  const now = Date.now();
  let timeStr = '';
  let t = now;
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    timeStr = ENCODING[t % ENCODING_LEN] + timeStr;
    t = Math.floor(t / ENCODING_LEN);
  }
  let randStr = '';
  const randBytes = crypto.getRandomValues(new Uint8Array(RANDOM_LEN));
  for (let i = 0; i < RANDOM_LEN; i++) {
    randStr += ENCODING[randBytes[i] % ENCODING_LEN];
  }
  return timeStr + randStr;
}
