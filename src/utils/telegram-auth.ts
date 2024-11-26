import crypto from 'node:crypto';

export function verifyTelegramAuth(data: Record<string, string>, botToken: string): boolean {
  const secretKey = crypto.createHash('sha256').update(botToken).digest();

  const hash = data.hash;
  if (!hash) {
    return false;
  }

  // delete hash from data
  const dataCheck = { ...data };
  delete dataCheck.hash;

  // sort data
  const sortedData = Object.keys(dataCheck)
    .sort()
    .map(key => `${key}=${dataCheck[key]}`)
    .join('\n');

  // calculate hash
  const hmac = crypto.createHmac('sha256', secretKey).update(sortedData).digest('hex');

  return hmac === hash;
}
