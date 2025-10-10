#!/usr/bin/env python
"""
测试脚本：重现 dora_backend_worker 中的 blob 下载问题
模拟 preprocess_file 任务中的文件下载流程
"""
import os
import sys
import django
import traceback

# 设置Django环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from base.storage.blob import BlobStorage
from bibliography.defs import CustomBibliographyFileS3Template
from bibliography.logic.pdf_parsing import get_file_content
from bibliography.models import CustomBibliographyFile
from django.conf import settings


def test_specific_file_download():
    """测试特定文件的下载（从日志中提取的文件信息）"""
    print("=" * 80)
    print("测试场景 1: 重现特定文件下载问题")
    print("=" * 80)
    
    # 从日志中提取的信息
    problematic_file_pk = "305729e8-c1f7-439e-9bef-139202a90414"
    file_name = "Luis.pdf"
    
    print(f"\n目标文件:")
    print(f"  - PK: {problematic_file_pk}")
    print(f"  - 文件名: {file_name}")
    
    # 1. 构造文件路径
    file_path = CustomBibliographyFileS3Template.format(pk=problematic_file_pk)
    print(f"  - Blob 路径: {file_path}")
    
    # 2. 初始化 BlobStorage
    print(f"\n步骤 1: 初始化 BlobStorage")
    try:
        blob_storage = BlobStorage()
        print(f"  ✓ 初始化成功")
        print(f"  - 账户名: {blob_storage.account_name}")
        print(f"  - 容器名: {blob_storage.container_name}")
        
        # 显示实际构造的 URL
        blob_client = blob_storage.container_client.get_blob_client(file_path)
        print(f"  - Blob URL: {blob_client.url}")
    except Exception as e:
        print(f"  ✗ 初始化失败: {e}")
        traceback.print_exc()
        return False
    
    # 3. 检查文件是否存在（这里通常会触发问题）
    print(f"\n步骤 2: 检查文件是否存在 (key_exists)")
    try:
        exists = blob_storage.key_exists(file_path)
        if exists:
            print(f"  ✓ 文件存在")
        else:
            print(f"  ✗ 文件不存在（这可能是问题所在）")
            
            # 列出相似路径的文件
            print(f"\n  尝试列出 'bibliography/custom/' 下的文件:")
            try:
                keys = blob_storage.find_keys("bibliography/custom/")
                if keys:
                    print(f"  找到 {len(keys)} 个文件:")
                    for key in keys[:10]:  # 只显示前10个
                        print(f"    - {key}")
                else:
                    print(f"  该前缀下没有文件")
            except Exception as list_err:
                print(f"  列出文件失败: {list_err}")
            
            return False
    except Exception as e:
        print(f"  ✗ 检查失败: {e}")
        print(f"  异常类型: {type(e).__name__}")
        traceback.print_exc()
        return False
    
    # 4. 下载文件内容
    print(f"\n步骤 3: 下载文件内容 (get_file_contents)")
    try:
        content = blob_storage.get_file_contents(file_path)
        print(f"  ✓ 下载成功")
        print(f"  - 文件大小: {len(content)} bytes")
        print(f"  - 前 100 bytes: {content[:100]}")
    except Exception as e:
        print(f"  ✗ 下载失败: {e}")
        print(f"  异常类型: {type(e).__name__}")
        traceback.print_exc()
        return False
    
    # 5. 测试完整的 get_file_content 函数（模拟 worker 调用）
    print(f"\n步骤 4: 测试完整的 get_file_content 函数")
    try:
        metadata, cleaned_text = get_file_content(problematic_file_pk, file_name)
        print(f"  ✓ 成功解析 PDF")
        print(f"  - 元数据: {metadata}")
        print(f"  - 文本长度: {len(cleaned_text)} 字符")
        print(f"  - 文本前 200 字符: {cleaned_text[:200]}")
    except Exception as e:
        print(f"  ✗ 解析失败: {e}")
        print(f"  异常类型: {type(e).__name__}")
        traceback.print_exc()
        return False
    
    print(f"\n{'='*80}")
    print(f"✓ 测试通过！文件下载和解析成功")
    print(f"{'='*80}")
    return True


def test_database_file():
    """测试从数据库中获取实际的 CustomBibliographyFile 记录"""
    print("\n" + "=" * 80)
    print("测试场景 2: 从数据库查询文件并测试下载")
    print("=" * 80)
    
    # 查询数据库中的文件
    try:
        files = CustomBibliographyFile.objects.all().order_by('-created_at')[:5]
        if not files:
            print("\n数据库中没有 CustomBibliographyFile 记录")
            return False
        
        print(f"\n找到 {files.count()} 个文件记录（显示最近5个）:")
        for i, file in enumerate(files, 1):
            print(f"\n文件 {i}:")
            print(f"  - PK: {file.pk}")
            print(f"  - 名称: {file.name}")
            print(f"  - 状态: {file.status}")
            print(f"  - 格式: {file.format}")
            print(f"  - 创建时间: {file.created_at}")
            
            # 测试这个文件
            file_path = CustomBibliographyFileS3Template.format(pk=file.pk)
            blob_storage = BlobStorage()
            
            print(f"  测试文件: {file_path}")
            try:
                exists = blob_storage.key_exists(file_path)
                if exists:
                    print(f"  ✓ Blob 存在")
                    
                    # 尝试下载
                    try:
                        content = blob_storage.get_file_contents(file_path)
                        print(f"  ✓ 下载成功 ({len(content)} bytes)")
                    except Exception as download_err:
                        print(f"  ✗ 下载失败: {download_err}")
                else:
                    print(f"  ✗ Blob 不存在")
            except Exception as check_err:
                print(f"  ✗ 检查失败: {check_err}")
                traceback.print_exc()
        
        return True
        
    except Exception as e:
        print(f"\n✗ 数据库查询失败: {e}")
        traceback.print_exc()
        return False


def test_blob_client_methods():
    """测试不同的 blob client 方法，找出哪个方法引发 'hosts' 异常"""
    print("\n" + "=" * 80)
    print("测试场景 3: 测试不同的 Blob Client 方法")
    print("=" * 80)
    
    problematic_file_pk = "305729e8-c1f7-439e-9bef-139202a90414"
    file_path = CustomBibliographyFileS3Template.format(pk=problematic_file_pk)
    
    print(f"\n目标 Blob: {file_path}")
    
    try:
        blob_storage = BlobStorage()
        blob_client = blob_storage.container_client.get_blob_client(file_path)
        
        # 测试 1: exists() 方法
        print(f"\n方法 1: blob_client.exists()")
        try:
            result = blob_client.exists()
            print(f"  ✓ 成功: {result}")
        except Exception as e:
            print(f"  ✗ 失败: {type(e).__name__}: {e}")
            traceback.print_exc()
        
        # 测试 2: get_blob_properties() 方法
        print(f"\n方法 2: blob_client.get_blob_properties()")
        try:
            props = blob_client.get_blob_properties()
            print(f"  ✓ 成功")
            print(f"  - 大小: {props.size}")
            print(f"  - 类型: {props.content_settings.content_type}")
        except Exception as e:
            print(f"  ✗ 失败: {type(e).__name__}: {e}")
            traceback.print_exc()
        
        # 测试 3: download_blob() 方法
        print(f"\n方法 3: blob_client.download_blob()")
        try:
            blob_data = blob_client.download_blob()
            content = blob_data.readall()
            print(f"  ✓ 成功")
            print(f"  - 大小: {len(content)} bytes")
        except Exception as e:
            print(f"  ✗ 失败: {type(e).__name__}: {e}")
            traceback.print_exc()
        
        return True
        
    except Exception as e:
        print(f"\n✗ 初始化失败: {e}")
        traceback.print_exc()
        return False


def show_environment_info():
    """显示环境信息"""
    print("=" * 80)
    print("环境信息")
    print("=" * 80)
    
    print(f"\nAzure Blob Storage 配置:")
    print(f"  - AZURE_STORAGE_CONTAINER: {settings.AZURE_STORAGE_CONTAINER}")
    print(f"  - AZURE_STORAGE_LOCATION: {settings.AZURE_STORAGE_LOCATION}")
    if hasattr(settings, 'AZURE_STORAGE_ACCOUNT_NAME'):
        print(f"  - AZURE_STORAGE_ACCOUNT_NAME: {settings.AZURE_STORAGE_ACCOUNT_NAME}")
    if hasattr(settings, 'AZURE_STORAGE_ACCOUNT_URL'):
        print(f"  - AZURE_STORAGE_ACCOUNT_URL: {settings.AZURE_STORAGE_ACCOUNT_URL}")
    if hasattr(settings, 'AZURE_STORAGE_DOMAIN_SUFFIX'):
        print(f"  - AZURE_STORAGE_DOMAIN_SUFFIX: {settings.AZURE_STORAGE_DOMAIN_SUFFIX}")
    print(f"  - 使用 CONNECTION_STRING: {'是' if settings.AZURE_STORAGE_CONNECTION_STRING else '否'}")
    
    print(f"\nPython 包版本:")
    try:
        import azure.core
        import azure.storage.blob
        import requests
        print(f"  - azure-core: {azure.core.__version__}")
        print(f"  - azure-storage-blob: {azure.storage.blob.__version__}")
        print(f"  - requests: {requests.__version__}")
    except Exception as e:
        print(f"  ✗ 获取版本失败: {e}")


if __name__ == "__main__":
    # 显示环境信息
    show_environment_info()
    
    # 测试 1: 重现特定文件下载问题
    print("\n")
    success1 = test_specific_file_download()
    
    # 测试 2: 测试数据库中的文件
    success2 = test_database_file()
    
    # 测试 3: 测试不同的 blob client 方法
    success3 = test_blob_client_methods()
    
    # 总结
    print("\n" + "=" * 80)
    print("测试总结")
    print("=" * 80)
    print(f"场景 1 (特定文件下载): {'✓ 通过' if success1 else '✗ 失败'}")
    print(f"场景 2 (数据库文件): {'✓ 通过' if success2 else '✗ 失败'}")
    print(f"场景 3 (不同方法测试): {'✓ 通过' if success3 else '✗ 失败'}")
    
    sys.exit(0 if (success1 or success2 or success3) else 1)
