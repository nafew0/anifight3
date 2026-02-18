from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import MultiplayerRoom
from .serializers import (
    MultiplayerRoomSerializer,
    CreateRoomSerializer,
    JoinRoomSerializer
)
import qrcode
from io import BytesIO
import base64


class MultiplayerRoomViewSet(viewsets.ModelViewSet):
    """API endpoints for multiplayer room management"""

    queryset = MultiplayerRoom.objects.all()
    serializer_class = MultiplayerRoomSerializer
    permission_classes = [AllowAny]
    lookup_field = 'room_code'

    @action(detail=False, methods=['post'])
    def create_room(self, request):
        """Create a new multiplayer room"""
        serializer = CreateRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create room
        room = MultiplayerRoom.objects.create(
            host_nickname=serializer.validated_data.get('host_nickname', 'Player 1'),
            template_id=serializer.validated_data['template_id'],
            anime_pool_ids=serializer.validated_data['anime_pool_ids'],
            status='waiting',
        )

        # Set host
        if request.user.is_authenticated:
            room.host = request.user

        # Ensure session exists
        if not request.session.session_key:
            request.session.create()
        room.host_session_id = request.session.session_key
        room.save()

        # Generate join URL
        frontend_url = f"http://localhost:5173"  # TODO: Make this configurable
        join_url = room.get_join_url(base_url=frontend_url)

        # Generate QR code
        qr_code_data = self.generate_qr_code(join_url)

        return Response({
            'room_code': room.room_code,
            'join_url': join_url,
            'qr_code': qr_code_data,
            'status': room.status,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def join_room(self, request, room_code=None):
        """Join an existing room"""
        try:
            room = MultiplayerRoom.objects.get(room_code=room_code)
        except MultiplayerRoom.DoesNotExist:
            return Response(
                {'error': 'Room not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if room is available
        if room.status not in ['waiting', 'ready']:
            return Response(
                {'error': 'Room is not available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if room.guest_session_id:
            return Response(
                {'error': 'Room is full'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = JoinRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Set guest
        room.guest_nickname = serializer.validated_data.get('guest_nickname', 'Player 2')
        if request.user.is_authenticated:
            room.guest = request.user

        # Ensure session exists
        if not request.session.session_key:
            request.session.create()
        room.guest_session_id = request.session.session_key
        room.status = 'ready'
        room.save()

        return Response({
            'room_code': room.room_code,
            'host_nickname': room.host_nickname,
            'guest_nickname': room.guest_nickname,
            'status': room.status,
        })

    @action(detail=True, methods=['get'])
    def room_status(self, request, room_code=None):
        """Get room status"""
        try:
            room = MultiplayerRoom.objects.get(room_code=room_code)
        except MultiplayerRoom.DoesNotExist:
            return Response(
                {'error': 'Room not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(room)
        return Response(serializer.data)

    def generate_qr_code(self, data):
        """Generate QR code as base64 image"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return f"data:image/png;base64,{img_str}"
