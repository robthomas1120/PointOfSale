from huey_instance import huey
from firebase import Firebase

@huey.task(retries=float('inf'), retry_delay=10)
def queue_fb_sync(array):
    try:
        firebase = Firebase()
        firebase.sync_order(array)
        print("Synced order!")
    except Exception as e:
        print(f"Failed to write to Firebase: {e}, retrying...")
        raise e