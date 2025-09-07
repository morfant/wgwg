import asyncio
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis

from ai_chat_handler import router as ai_chat_router, typing_worker
from sc_handler import router as sc_router
from chat_room_handler import router as chat_room_router, set_redis_client, redis_client as chat_redis_client

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ai_chat_router)
app.include_router(sc_router)
app.include_router(chat_room_router)

@app.on_event("startup")
async def startup_event():
    # Start the typing effect worker
    asyncio.create_task(typing_worker())

    # Initialize Redis client for chat rooms
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        client = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        await client.ping()
        set_redis_client(client)
        print("Redis client connected and set for chat_room_handler.")
    except Exception as e:
        print(f"[main] Redis initialization failed: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    # Close the Redis client connection
    if chat_redis_client:
        try:
            await chat_redis_client.close()
            print("Redis client connection closed.")
        except Exception as e:
            print(f"[main] Error closing Redis client: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=4001, reload=True)