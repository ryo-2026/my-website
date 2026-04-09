/**
 * ランダムな16バイトのソルト（hex文字列）を生成する
 */
export function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * PIN + ソルトをSHA-256でハッシュ化し、hex文字列を返す
 * @param {string} pin
 * @param {string} salt
 * @returns {Promise<string>}
 */
export async function hashPin(pin, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
