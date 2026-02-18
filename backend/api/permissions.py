"""
Custom permission classes for API endpoints
"""
from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit/delete it.

    - Read permissions (GET, HEAD, OPTIONS) are allowed to any request
    - Write permissions (POST, PUT, PATCH, DELETE) are only allowed to the owner
    - For objects without an owner (owner=null), only staff/admin can edit
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Admin content (owner=null) can only be edited by staff
        if not hasattr(obj, 'owner') or obj.owner is None:
            return request.user and request.user.is_staff

        # Write permissions are only allowed to the owner of the object
        return obj.owner == request.user


class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow read access to anyone,
    but write access only to authenticated users.

    - Read permissions (GET, HEAD, OPTIONS) are allowed to any request
    - Write permissions (POST, PUT, PATCH, DELETE) require authentication
    """

    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to authenticated users
        return request.user and request.user.is_authenticated
