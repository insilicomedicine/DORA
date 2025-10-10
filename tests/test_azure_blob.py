#!/usr/bin/env python
"""
测试脚本：验证Azure Blob Storage集成
"""
import os
import sys
import django

# 设置Django环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from base.storage.blob import BlobStorage
from django.conf import settings
import traceback


def test_azure_blob_storage():
    """测试Azure Blob Storage的各项功能"""
    print("=" * 80)
    print("开始测试 Azure Blob Storage 集成")
    print("=" * 80)
    
    # 1. 显示配置信息
    print("\n1. Azure Blob Storage 配置信息:")
    print(f"   - 连接字符串已配置: {'是' if settings.AZURE_STORAGE_CONNECTION_STRING else '否'}")
    print(f"   - 容器名称: {settings.AZURE_STORAGE_CONTAINER}")
    print(f"   - 位置: {settings.AZURE_STORAGE_LOCATION}")
    print(f"   - 自动创建容器: {settings.AZURE_STORAGE_AUTO_CREATE_CONTAINER}")
    
    try:
        # 2. 初始化BlobStorage
        print("\n2. 初始化 BlobStorage 客户端...")
        storage = BlobStorage()
        print(f"   ✓ 成功初始化")
        print(f"   - 账户名称: {storage.account_name}")
        print(f"   - 容器名称: {storage.container_name}")
        
        # 3. 测试容器连接
        print("\n3. 测试容器连接...")
        try:
            properties = storage.container_client.get_container_properties()
            print(f"   ✓ 成功连接到容器")
            print(f"   - 容器创建时间: {properties.last_modified}")
        except Exception as e:
            print(f"   ✗ 容器连接失败: {e}")
            return False
        
        # 4. 测试文件上传
        print("\n4. 测试文件上传...")
        test_key = "test/azure_blob_test.txt"
        test_content = "Hello from Azure Blob Storage! 测试内容".encode('utf-8')
        
        try:
            storage.put_file(test_key, test_content, overwrite=True)
            print(f"   ✓ 成功上传文件: {test_key}")
        except Exception as e:
            print(f"   ✗ 文件上传失败: {e}")
            traceback.print_exc()
            return False
        
        # 5. 测试文件存在性检查
        print("\n5. 测试文件存在性检查...")
        try:
            exists = storage.key_exists(test_key)
            if exists:
                print(f"   ✓ 文件存在检查通过")
            else:
                print(f"   ✗ 文件不存在")
                return False
        except Exception as e:
            print(f"   ✗ 检查失败: {e}")
            return False
        
        # 6. 测试文件下载
        print("\n6. 测试文件下载...")
        try:
            downloaded_content = storage.get_file_contents(test_key)
            if downloaded_content == test_content:
                print(f"   ✓ 文件下载成功，内容匹配")
                print(f"   - 内容: {downloaded_content.decode('utf-8')}")
            else:
                print(f"   ✗ 文件内容不匹配")
                return False
        except Exception as e:
            print(f"   ✗ 文件下载失败: {e}")
            traceback.print_exc()
            return False
        
        # 7. 测试获取文件对象
        print("\n7. 测试获取文件对象...")
        try:
            file_obj = storage.get_file_object(test_key)
            print(f"   ✓ 成功获取文件对象")
            print(f"   - 文件大小: {file_obj['ContentLength']} 字节")
            print(f"   - 内容类型: {file_obj['ContentType']}")
            print(f"   - 最后修改: {file_obj['LastModified']}")
        except Exception as e:
            print(f"   ✗ 获取文件对象失败: {e}")
            traceback.print_exc()
            return False
        
        # 8. 测试查找文件（前缀搜索）
        print("\n8. 测试文件前缀搜索...")
        try:
            keys = storage.find_keys("test/")
            print(f"   ✓ 找到 {len(keys)} 个文件")
            for key in keys:
                print(f"   - {key}")
        except Exception as e:
            print(f"   ✗ 搜索失败: {e}")
            return False
        
        # 9. 测试生成预签名URL
        print("\n9. 测试生成预签名URL...")
        try:
            from base.storage.defs import AllowedBlobPresignedMethods
            
            # 测试GET URL
            get_url = storage.generate_presigned_blob_url(
                AllowedBlobPresignedMethods.GET_BLOB,
                test_key,
                expires_in=3600
            )
            print(f"   ✓ 成功生成GET预签名URL")
            print(f"   - URL长度: {len(get_url)} 字符")
            print(f"   - URL前缀: {get_url[:80]}...")
            
            # 测试PUT URL
            put_url = storage.generate_presigned_blob_url(
                AllowedBlobPresignedMethods.PUT_BLOB,
                "test/upload_test.txt",
                expires_in=3600
            )
            print(f"   ✓ 成功生成PUT预签名URL")
            
        except Exception as e:
            print(f"   ✗ 生成预签名URL失败: {e}")
            traceback.print_exc()
            return False
        
        # 10. 测试文件删除
        print("\n10. 测试文件删除...")
        try:
            result = storage.remove(test_key)
            print(f"   ✓ 成功删除文件: {test_key}")
            
            # 验证文件已删除
            exists = storage.key_exists(test_key)
            if not exists:
                print(f"   ✓ 确认文件已删除")
            else:
                print(f"   ✗ 文件仍然存在")
                return False
        except Exception as e:
            print(f"   ✗ 文件删除失败: {e}")
            return False
        
        print("\n" + "=" * 80)
        print("✓ 所有测试通过！Azure Blob Storage 配置正确")
        print("=" * 80)
        return True
        
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_azure_blob_storage()
    sys.exit(0 if success else 1)
