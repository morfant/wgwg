# 와글와글 (가제)


## client

### yarn

```shell
cd client

yarn install

yarn dev
```

### pnpm

```shell
cd client

pnpm install

pnpm dev
```


## backend

### python

```shell
cd backend

# 1. 가상환경 생성
pyton -m venv .venv

# 2. 가상환경 활성화
# Windows
source .venv/Scripts/activate  
# or
# Linux or Mac
source .venv/bin/activate  

# 3. 패키지 설치
pip install -r requirements.txt

# 4. 실행
python main.py
```

### uv

```shell
cd backend

# 1. 가상환경 생성
uv venv

# 2. 가상환경 활성화
# Windows
source .venv/Scripts/activate
# or 
# Linux or Mac
source .venv/bin/activate

# 3. 패키지 설치
uv pip install -r requirements.txt

# 4. 실행
uv run main.py
```

## docker

```shell
docker compose up -d
```