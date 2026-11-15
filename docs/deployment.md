# 무료 배포 준비: Render + Azure SQL

이 구성은 개인 PC와 VS Code를 꺼도 실행되도록 웹/API를 Render Free에, 실습 DB 3개를 Azure SQL Database 무료 요금제에 둡니다. 현재 저장소에는 배포 설정이 준비되어 있으며, 실제 리소스 생성과 외부 접속 검증은 계정 연결 후 진행해야 합니다.

## 필요한 계정과 무료 서비스의 범위

- Render 계정과 활성화된 Azure 구독이 필요합니다. Microsoft 계정 로그인과 Azure 구독 활성화는 별개입니다.
- Render 서비스는 `render.yaml`에서 `plan: free`로 고정했습니다. 미사용 15분 뒤 중지되며, 다음 접속 때 시작에 약 1분이 걸릴 수 있습니다. 무료 사용 시간·트래픽·빌드 한도가 있습니다. 결제 수단을 등록하지 않으면 트래픽 한도 초과 시 추가 결제 대신 서비스가 중지됩니다. 빌드 비용도 발생하지 않도록 지출 한도를 0으로 확인합니다.
- Azure SQL 무료 요금제는 DB별 월 100,000 vCore초와 데이터·백업 각 32GB를 제공합니다. 이 프로젝트는 DB 3개를 사용합니다. `useFreeLimit: true`, `freeLimitExhaustionBehavior: AutoPause`로 지정해 한도 소진 시 다음 달까지 정지합니다. 유료 초과 사용으로 변경하지 않습니다.
- 사용하지 않을 때는 웹 탭을 닫습니다. 기존 화면은 연결 상태를 30초마다 확인하므로 탭을 계속 열어두면 선택한 DB가 유휴 중지되지 않아 무료 연산량을 소모할 수 있습니다.
- 처음부터 유료 플랜이나 기간 한정 크레딧에 의존하지 않습니다. 계정의 무료 요금제 자격·지역 지원 여부를 확인해야 하며, 지원되지 않으면 유료 설정으로 대체하지 않습니다.
- Azure SQL은 SQL Server와 같은 T-SQL 엔진 계열이지만 인스턴스 관리 기능은 다릅니다. 이 배포 모드는 서버 DB 생성·TRUSTWORTHY 설정을 실행하지 않고, 미리 생성한 전용 DB 안에서 실습합니다. 실제 Azure에서 전체 실습 검증은 아직 필요합니다.

공식 문서: [Render Free](https://render.com/docs/free), [Azure SQL 무료 요금제](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-tier), [Render Blueprint](https://render.com/docs/blueprint-spec).

## Azure DB 준비

Azure에 로그인하고 사용할 구독·지역·리소스 그룹을 선택합니다. 포털에서 새 SQL **논리 서버**를 준비하고 SQL 인증 관리자 계정을 만듭니다. 비밀번호는 Render의 비밀 환경 변수에만 입력하며 저장소에 넣지 않습니다.

새 서버에 실습 DB가 아직 없는 상태에서 [deploy/azure-free-databases.json](../deploy/azure-free-databases.json)을 사용합니다. Azure Cloud Shell에 이 파일을 업로드한 다음 실제 값으로 바꾸어 미리 보기를 실행합니다.

```sh
az deployment group what-if \
  --resource-group YOUR_RESOURCE_GROUP \
  --template-file azure-free-databases.json \
  --mode Incremental \
  --parameters serverName=YOUR_SQL_SERVER location=YOUR_REGION
```

예상 결과는 `QueryGround_Company`, `QueryGround_Store`, `QueryGround_Campus` DB 3개 생성입니다. 기존 DB 변경이 보이면 중단합니다. 무료 플래그와 `AutoPause`를 확인한 후 같은 인수로 `what-if`를 `create`로 바꾸어 적용합니다. 생성 후 포털에서 각 DB가 무료 요금제이고 한도 소진 동작이 중지인지 다시 확인합니다. 생성이 실패하거나 상태가 불명확하면 기존 리소스를 먼저 확인하며, 무료 플래그를 제거해서 재시도하지 않습니다.

논리 서버 방화벽에는 Render 서비스의 Outbound IP 범위만 허용합니다. 데이터베이스를 전체 인터넷에 개방하지 않습니다. 이 템플릿은 인증·방화벽·다른 리소스를 변경하지 않습니다.

## Render 배포

현재 변경 사항을 포함한 저장소를 연결하고 **Blueprint**에서 `render.yaml`을 선택합니다. DB 방화벽 설정 전에는 초기 연결이 실패할 수 있으며, 방화벽을 설정한 뒤 같은 서비스에서 다시 배포합니다.

| 변수           | 값                                       |
| -------------- | ---------------------------------------- |
| `SQL_SERVER`   | `YOUR_SQL_SERVER.database.windows.net`   |
| `SQL_USER`     | 논리 서버의 SQL 관리자 계정              |
| `SQL_PASSWORD` | 해당 계정의 비밀번호, 비밀 값으로 입력   |
| `APP_USER`     | 브라우저 접속 계정. 기본값 `queryground` |
| `APP_PASSWORD` | 자동 생성되는 브라우저 접속 비밀번호     |

나머지 설정은 Blueprint에서 지정합니다. Render의 기본 주소는 `RENDER_EXTERNAL_URL`로 읽습니다. 별도 도메인을 사용하면 `PUBLIC_ORIGIN=https://실제도메인`을 지정합니다. 비밀번호와 `.env`는 Docker 이미지나 Git에 포함되지 않습니다.

Docker 이미지에는 React 빌드, API, 실습 초기 데이터, 교재 파일이 포함됩니다. 시작할 때 새 전용 DB만 준비하며 기존 준비된 DB의 내용은 보존합니다. 외부 접속은 HTTPS와 브라우저 기본 로그인으로 보호합니다. 학습 진행·작성 SQL·실행 기록은 기존과 같이 브라우저 저장소를 사용합니다.

로그인 비밀번호는 Render 환경 변수에서 확인합니다. 기본 상태 검사 `/healthz`에는 DB·사용자 정보가 없고, SQL API와 정적 파일·교재는 로그인이 필요합니다.

## 접속 확인과 기존 작업 이동

배포 성공 후 실제 발급된 HTTPS 주소에서 로그인하고, 세 데이터 선택·스키마 조회·SELECT 실행·취소·저장·교재 열기를 확인합니다. Azure 실습 DB의 DDL·DML·초기화 검사는 클라우드에 만든 전용 DB에서만 진행합니다.

로컬 주소와 배포 주소는 브라우저 저장소가 다릅니다. 로컬의 **전체 백업**을 내보내 배포 주소에서 **백업 복원**으로 가져옵니다. 이 백업은 작성한 SQL·진행·기록을 옮기며 SQL Server 테이블 데이터 자체를 복사하지 않습니다. 클라우드 DB는 기본 실습 데이터로 별도 시작하고, 로컬 실습 DB는 유지합니다.

주소를 발급하거나 실제 클라우드에서 검증하기 전에는 배포 완료로 간주하지 않습니다. 이 PC에서 실행한 개발 서버나 임시 터널 주소는 PC가 꺼진 상태의 호스팅을 대신하지 못합니다.
