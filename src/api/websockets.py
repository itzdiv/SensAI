from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter
from api.utils.logging import logger

router = APIRouter()


# WebSocket connection manager to handle multiple client connections
class ConnectionManager:
    def __init__(self):
        # Dictionary to store WebSocket connections by course_id
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, course_id: int):
        try:
            await websocket.accept()
            if course_id not in self.active_connections:
                self.active_connections[course_id] = set()
            self.active_connections[course_id].add(websocket)
            logger.info(f"WebSocket connected for course_id: {course_id}")
        except Exception as e:
            logger.error(f"Error accepting WebSocket connection: {str(e)}")
            raise

    def disconnect(self, websocket: WebSocket, course_id: int):
        if course_id in self.active_connections:
            self.active_connections[course_id].discard(websocket)
            if not self.active_connections[course_id]:
                del self.active_connections[course_id]
            logger.info(f"WebSocket disconnected for course_id: {course_id}")

    async def send_item_update(self, course_id: int, item_data: Dict):
        if course_id in self.active_connections:
            disconnected_websockets = set()
            for websocket in self.active_connections[course_id]:
                try:
                    await websocket.send_json(item_data)
                except Exception as exception:
                    logger.error(f"Error sending WebSocket message: {str(exception)}")
                    # Mark for removal if sending fails
                    disconnected_websockets.add(websocket)

            # Remove disconnected websockets
            for websocket in disconnected_websockets:
                self.disconnect(websocket, course_id)


# Create a connection manager instance
manager = ConnectionManager()


# WebSocket endpoint for course generation updates
@router.websocket("/course/{course_id}/generation")
async def websocket_course_generation(websocket: WebSocket, course_id: int):
    try:
        logger.info(f"Attempting WebSocket connection for course_id: {course_id}")
        await manager.connect(websocket, course_id)

        # Keep the connection alive until client disconnects
        while True:
            try:
                # Accept JSON pings; ignore/echo pongs to keep alive
                try:
                    data = await websocket.receive_json()
                    if isinstance(data, dict) and data.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                        continue
                except Exception:
                    # Fallback to text receive for non-JSON clients
                    await websocket.receive_text()
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for course_id: {course_id}")
                break
            except Exception as e:
                logger.error(f"Error in WebSocket message loop: {str(e)}")
                break
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected during connection for course_id: {course_id}")
        manager.disconnect(websocket, course_id)
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket endpoint: {str(e)}")
        manager.disconnect(websocket, course_id)


# Function to get the connection manager instance
def get_manager() -> ConnectionManager:
    return manager
