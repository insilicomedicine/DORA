#!/usr/bin/env python
"""Check bibliography file statuses"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from bibliography.models import CustomBibliographyFile
from django.db.models import Count

# Get status counts
status_counts = CustomBibliographyFile.objects.values('status').annotate(count=Count('id'))
print("\n=== File Status Counts ===")
for s in status_counts:
    print(f"{s['status']}: {s['count']}")

# Get recent files
print("\n=== Recent 10 Files ===")
recent_files = CustomBibliographyFile.objects.all().order_by('-created_at')[:10]
for f in recent_files:
    print(f"{f.pk} | {f.name[:30]:30} | {f.status:10} | {f.created_at}")

# Check for stuck files
print("\n=== Files in uploading/uploaded status ===")
stuck_files = CustomBibliographyFile.objects.filter(status__in=['uploading', 'uploaded']).order_by('-created_at')
for f in stuck_files:
    print(f"{f.pk} | {f.name[:30]:30} | {f.status:10} | {f.created_at}")
