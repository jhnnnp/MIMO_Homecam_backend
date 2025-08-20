// controllers/Syllabus.js
const syllabusService = require('../service/syllabusService');

exports.getSyllabusFiles = async (req, res) => {
  try {
    const files = await syllabusService.getAllSyllabusFiles();
    res.status(200).json({ success: true, data: files });
  } catch (error) {
    console.error('S3 파일 목록 불러오기 실패:', error);
    res.status(500).json({ success: false, message: '파일 목록 로딩 실패' });
  }
};

exports.searchSyllabusFiles = async (req, res) => {
  const query = req.query.query?.toLowerCase();
  if (!query) {
    return res.status(400).json({ success: false, message: '검색어가 필요합니다.' });
  }

  try {
    const files = await syllabusService.getAllSyllabusFiles();
    const filtered = files.filter(file => file.name.toLowerCase().includes(query));
    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    console.error('검색 실패:', error);
    res.status(500).json({ success: false, message: '검색 중 오류 발생' });
  }
};
