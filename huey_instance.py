from huey import SqliteHuey

huey = SqliteHuey(filename='queue.db')

import tasks