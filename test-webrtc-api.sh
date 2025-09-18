#!/bin/bash

# WebRTC API 테스트 스크립트
# 테스트 전에 JWT 토큰이 필요합니다

echo "🧪 WebRTC API 테스트 시작"
echo "================================"

# 기본 설정
API_BASE="http://localhost:4001/api"
WS_BASE="ws://localhost:8080"

# JWT 토큰 (실제 테스트 시 로그인해서 받은 토큰으로 교체 필요)
JWT_TOKEN="your_jwt_token_here"

# 헤더 설정
HEADERS="-H 'Content-Type: application/json'"
if [ "$JWT_TOKEN" != "your_jwt_token_here" ]; then
    HEADERS="$HEADERS -H 'Authorization: Bearer $JWT_TOKEN'"
fi

echo "📡 API 서버 상태 확인"
echo "GET $API_BASE/streaming/health"
curl -s $HEADERS "$API_BASE/streaming/health" | jq '.' || echo "❌ API 서버 연결 실패"
echo ""

echo "📊 활성 세션 조회"
echo "GET $API_BASE/streaming/sessions/active"
curl -s $HEADERS "$API_BASE/streaming/sessions/active" | jq '.' || echo "❌ 세션 조회 실패"
echo ""

echo "📹 카메라 스트림 등록 테스트"
echo "POST $API_BASE/streaming/camera/register"
curl -s -X POST $HEADERS \
  -d '{
    "cameraId": "test_camera_001",
    "streamConfig": {
      "quality": "1080p",
      "framerate": 30,
      "bitrate": 2000000
    }
  }' \
  "$API_BASE/streaming/camera/register" | jq '.' || echo "❌ 카메라 등록 실패"
echo ""

echo "👀 뷰어 연결 테스트"
echo "POST $API_BASE/streaming/viewer/connect"
curl -s -X POST $HEADERS \
  -d '{
    "cameraId": "test_camera_001",
    "viewerConfig": {
      "quality": "1080p"
    }
  }' \
  "$API_BASE/streaming/viewer/connect" | jq '.' || echo "❌ 뷰어 연결 실패"
echo ""

echo "📊 활성 세션 재조회 (뷰어 포함)"
echo "GET $API_BASE/streaming/sessions/active?includeViewers=true"
curl -s $HEADERS "$API_BASE/streaming/sessions/active?includeViewers=true" | jq '.' || echo "❌ 세션 조회 실패"
echo ""

echo "💓 하트비트 테스트"
echo "POST $API_BASE/streaming/sessions/{sessionId}/heartbeat"
# 실제 sessionId를 사용해야 함
SESSION_ID="test_session_id"
curl -s -X POST $HEADERS \
  -d '{
    "clientType": "camera"
  }' \
  "$API_BASE/streaming/sessions/$SESSION_ID/heartbeat" | jq '.' || echo "❌ 하트비트 실패"
echo ""

echo "🎥 품질 변경 테스트"
echo "POST $API_BASE/streaming/sessions/{sessionId}/quality"
curl -s -X POST $HEADERS \
  -d '{
    "quality": "720p"
  }' \
  "$API_BASE/streaming/sessions/$SESSION_ID/quality" | jq '.' || echo "❌ 품질 변경 실패"
echo ""

echo "📡 WebRTC 시그널링 테스트"
echo "POST $API_BASE/streaming/signaling/{sessionId}"
curl -s -X POST $HEADERS \
  -d '{
    "type": "offer",
    "data": "test_sdp_data",
    "from": "viewer_001",
    "to": "camera_001"
  }' \
  "$API_BASE/streaming/signaling/$SESSION_ID" | jq '.' || echo "❌ 시그널링 실패"
echo ""

echo "📊 세션 통계 조회"
echo "GET $API_BASE/streaming/sessions/{sessionId}/stats"
curl -s $HEADERS "$API_BASE/streaming/sessions/$SESSION_ID/stats" | jq '.' || echo "❌ 통계 조회 실패"
echo ""

echo "🔌 WebSocket 연결 테스트"
echo "WebSocket 서버 상태: $WS_BASE"
echo "curl은 WebSocket을 직접 테스트할 수 없으므로 wscat 또는 다른 도구 사용 권장"
echo ""

echo "✅ API 테스트 완료"
echo "================================"
echo ""
echo "📝 참고사항:"
echo "1. JWT 토큰이 필요합니다 (로그인 후 받은 토큰)"
echo "2. 실제 카메라 ID를 사용해야 합니다"
echo "3. 세션 ID는 실제 생성된 것을 사용해야 합니다"
echo "4. WebSocket 테스트는 별도 도구가 필요합니다"
