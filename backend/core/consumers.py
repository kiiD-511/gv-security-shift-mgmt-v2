# core/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class BaseConsumer(AsyncWebsocketConsumer):
    group_name = None

    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close()
            return

        if self.group_name:
            await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def broadcast_event(self, event):
        await self.send(text_data=json.dumps(event["event"]))


class AdminConsumer(BaseConsumer):
    group_name = "admins"


class SupervisorConsumer(BaseConsumer):
    group_name = "supervisors"


class GuardConsumer(BaseConsumer):
    group_name = "guards"
