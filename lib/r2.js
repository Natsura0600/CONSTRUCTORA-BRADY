const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

let client = null;

function configured() {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

function s3() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED'
    });
  }
  return client;
}

const bucket = () => process.env.R2_BUCKET;

function isMissing(e) {
  return e && (e.name === 'NoSuchKey' || e.Code === 'NoSuchKey' || (e.$metadata && e.$metadata.httpStatusCode === 404));
}

async function getJson(key) {
  try {
    const r = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return JSON.parse(await r.Body.transformToString());
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

async function putJson(key, obj) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: JSON.stringify(obj),
      ContentType: 'application/json; charset=utf-8',
      CacheControl: 'no-store'
    })
  );
}

async function putObject(key, body, contentType) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );
}

async function getObject(key) {
  try {
    return await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

module.exports = { configured, getJson, putJson, putObject, getObject };
