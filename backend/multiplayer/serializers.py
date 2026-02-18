from rest_framework import serializers
from .models import MultiplayerRoom


class MultiplayerRoomSerializer(serializers.ModelSerializer):
    join_url = serializers.SerializerMethodField()

    class Meta:
        model = MultiplayerRoom
        fields = [
            'id', 'room_code', 'host_nickname', 'guest_nickname',
            'status', 'join_url', 'created_at', 'host_connected',
            'guest_connected'
        ]
        read_only_fields = ['room_code', 'join_url', 'created_at']

    def get_join_url(self, obj):
        request = self.context.get('request')
        if request:
            base_url = f"{request.scheme}://{request.get_host()}"
            # Frontend URL for joining
            frontend_url = base_url.replace(':8000', ':5174')  # Adjust for dev
            return obj.get_join_url(frontend_url)
        return obj.get_join_url()


class CreateRoomSerializer(serializers.Serializer):
    host_nickname = serializers.CharField(max_length=50, default='Player 1')
    template_id = serializers.IntegerField()
    anime_pool_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )


class JoinRoomSerializer(serializers.Serializer):
    guest_nickname = serializers.CharField(max_length=50, default='Player 2')
