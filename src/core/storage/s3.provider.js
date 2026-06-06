const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

class S3StorageProvider {
  constructor({ region, bucket, accessKeyId, secretAccessKey }) {
    this.bucket = bucket;
    this.region = region;

    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Upload a buffer to S3 under the given key.
   * @param {Buffer} buffer     – File contents
   * @param {string} key        – S3 object key, e.g. "products/2026-06/photo-abc.webp"
   * @param {string} mimeType   – MIME type, e.g. "image/webp"
   * @returns {Promise<string>} – Full public URL of the uploaded object
   */
  async upload(buffer, key, mimeType) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.client.send(command);

    return this.getPublicUrl(key);
  }

  /**
   * Delete an object from S3 by key.
   * Silently succeeds if the key does not exist.
   * @param {string} key – S3 object key
   */
  async delete(key) {
    if (!key) {
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Build the full public URL for an S3 object.
   * @param {string} key – S3 object key
   * @returns {string}
   */
  getPublicUrl(key) {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Extract the S3 object key from a full S3 URL that was created by this provider.
   * Returns null if the URL does not belong to this bucket.
   * @param {string} url – Full S3 URL
   * @returns {string|null}
   */
  extractKeyFromUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const prefix = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`;

    if (url.startsWith(prefix)) {
      return url.slice(prefix.length);
    }

    // Also handle path-style URLs
    const pathPrefix = `https://s3.${this.region}.amazonaws.com/${this.bucket}/`;

    if (url.startsWith(pathPrefix)) {
      return url.slice(pathPrefix.length);
    }

    return null;
  }
}

module.exports = S3StorageProvider;
