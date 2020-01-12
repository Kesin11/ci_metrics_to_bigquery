# gcf_junit_xml_to_bq
Upload JUnit test report to BigQuery with GCF + GCS

# Setup
```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export BUCKET_PREFIX="PROJECT_SHORT_ID"

gcloud init # Select your GCP project
```

# terraform
Create GCS bucket and BigQuery dateaset, table.

```bash
cd terraform
terraform init
terraform plan -var "project_id=${PROJECT_ID}" -var "bucket_prefix=${BUCKET_PREFIX}"
terraform apply -var "project_id=${PROJECT_ID}" -var "bucket_prefix=${BUCKET_PREFIX}"
```

## tfstate
tfstate is stored your local in default. If you want to save tfstate other backend, you need to append terraform code.

# Cloud Functions
Create GCS trigger function that convert JUnit and load to BigQuery.

```bash
export GCS_BUCKET="${BUCKET_PREFIX}-pipeline-metrics-bq"
npm run deploy
```
