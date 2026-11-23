$env:MONGO_URI = "mongodb://Gagan:Gagan2004@ac-czk6ww4-shard-00-00.4f5yxtq.mongodb.net:27017,ac-czk6ww4-shard-00-01.4f5yxtq.mongodb.net:27017,ac-czk6ww4-shard-00-02.4f5yxtq.mongodb.net:27017/?ssl=true&replicaSet=atlas-nsitt0-shard-0&authSource=admin"
$env:DB_NAME   = "cg_agri_transparency"
& "C:\Users\LOQ\.bankview-test-venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8001
