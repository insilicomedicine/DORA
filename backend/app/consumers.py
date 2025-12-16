from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationsConsumer(AsyncJsonWebsocketConsumer):
    async def websocket_connect(self, message):
        print(self.scope)
        if self.scope["user"].is_anonymous:
            print("Anonymous user tried to connect")
            await self.close()
        else:
            print("User connected")
            await self.channel_layer.group_add(f"user-{self.scope['user'].id}", self.channel_name)
            await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})
        else:
            await self.send_json(content)

    async def notification(self, content):
        await self.send_json(content)
