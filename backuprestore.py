import os
import traceback
import time

# Import all major classes
from azure.common.credentials import ServicePrincipalCredentials
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.compute.models import DiskCreateOption
from azure.mgmt.compute.models import Snapshot
from azure.storage.blob import BlockBlobService
from msrestazure.azure_exceptions import CloudError

# Intanciate Azure Blob storage client with credentials
block_blob_service = BlockBlobService(account_name='testsapstorage', account_key='v6jz1WeAX6ZNZevYEW4eM7RnfFP7nhQ3Z8NIMQ+a54NK94vesRqqxTUpMvia9QiVhH6feNhzYvTt7IzkjTfg+A==')

# Define Azure Region
LOCATION = 'westeurope'

# Define Resource Group
GROUP_NAME = 'testsap'
# Define VM Name
VM_NAME = 'testsapvm'

# Get credentials from env variables containing Service Principal details
def get_credentials():
    subscription_id = os.environ['AZURE_SUBSCRIPTION_ID']
    credentials = ServicePrincipalCredentials(
        client_id=os.environ['client-id'],
        secret=os.environ['secret'],
        tenant=os.environ['domain']
    )
    return credentials, subscription_id


def run_example():
    """Backup/restore example."""

    # Authentication    
    credentials, subscription_id = get_credentials()
    resource_client = ResourceManagementClient(credentials, subscription_id)
    compute_client = ComputeManagementClient(credentials, subscription_id)
    network_client = NetworkManagementClient(credentials, subscription_id)

    # Create new snapshot from data disk on running VM
    async_creation = compute_client.snapshots.create_or_update(
        GROUP_NAME,
        'snapshot01',
        {
            'location': 'westeurope',
            'creation_data': {
                'create_option': 'Copy',
                'source_resource_id': '/subscriptions/e243327e-b18c-4766-8f44-d9a945082e57/resourceGroups/TESTSAP/providers/Microsoft.Compute/disks/data'
            }
        }

    )
    snapshot_resource = async_creation.result()
    print (snapshot_resource.id)

    # Get access to snapshot's underlying SAS URI
    async_creation = compute_client.snapshots.grant_access(
        GROUP_NAME,
        "snapshot01",
        "Read",
        "3600"
    )
    snapshot_resource = async_creation.result()
    print (snapshot_resource)

    access_sas = snapshot_resource.access_sas

    # Async copy snapshot to Storage Account
    copy_operation = block_blob_service.copy_blob("backups","backup01.vhd",access_sas)
    
    status = copy_operation.status

    while (status != "success"):
            time.sleep(5)
            blob = block_blob_service.get_blob_properties("backups","backup01.vhd")            
            status = blob.properties.copy.status
            print (status)         

    # Re-hidrate a new disk from blob storage backup
    async_creation = compute_client.disks.create_or_update(
        GROUP_NAME,
        'restore01',
        {
            'location': 'westeurope',
            'creation_data': {
                'create_option': DiskCreateOption.import_enum,
                'source_uri': 'https://testsapstorage.blob.core.windows.net/backups/backup01.vhd'
            }
        }

    )
    disk_resource = async_creation.result()
    print (disk_resource.id)


    # Attach restored disk to running VM
    vm = compute_client.virtual_machines.get(
        GROUP_NAME,
        VM_NAME
    )

    managed_disk = compute_client.disks.get(GROUP_NAME, 'disk02')

    vm.storage_profile.data_disks.append({
        'name': managed_disk.name,
        'lun': "2",
        'create_option': DiskCreateOption.attach,
        'managed_disk': {
            'id': managed_disk.id
        }
    })

    async_update = compute_client.virtual_machines.create_or_update(
        GROUP_NAME,
        vm.name,
        vm,
    )
    async_update.wait()


if __name__ == "__main__":
    run_example()