import asyncio
from langchain_core.runnables.config import RunnableConfig
from agent_with_chat import get_graph

# WebSocket client lists
chat_clients = []
sc_clients = []

# LangGraph agent setup
graph = get_graph()
configurable = {"thread_id": "1"}
config = RunnableConfig(configurable=configurable, recursion_limit=200)

# Async queue for typing effect
typing_queue: asyncio.Queue = asyncio.Queue()

# Lock for broadcasting messages
send_lock = asyncio.Lock()

# Morse test variables
morse_test = False
morse_idx = 0
user_comment = False
