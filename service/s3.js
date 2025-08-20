// service/syllabusService.js
const AWS = require('aws-sdk');
require('dotenv').config();
console.log('✅ [ENV in syllabusService]');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID);
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY?.slice(0, 6));
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME);

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

exports.getAllSyllabusFiles = async () => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Prefix: process.env.AWS_FOLDER_PREFIX,
  };

  const data = await s3.listObjectsV2(params).promise();

  const files = data.Contents.filter(obj => obj.Size > 0).map(obj => ({
    key: obj.Key,
    name: obj.Key.split('/').pop(),
    size: obj.Size,
    lastModified: obj.LastModified,
    url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${obj.Key}`,
  }));

  return files;
};
