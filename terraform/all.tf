variable "project_id" {
  type = string
}

variable "bucket_prefix" {
  type = string
}

locals {
  location = "US" # 米国マルチリージョンが最安値
}

provider "google" {
  project = var.project_id
  version = "~>v3.4.0"
}

# GCS
resource "google_storage_bucket" "default" {
  name = "${var.bucket_prefix}-pipeline-metrics-bq"
  storage_class = "NEARLINE"
  location = local.location
}

# BigQuery
## dataset
resource "google_bigquery_dataset" "default" {
  dataset_id = "pipeline"
  location = local.location
}

# JUnitデータ用
resource "google_bigquery_table" "raw_junit" {
  dataset_id = google_bigquery_dataset.default.dataset_id
  table_id   = "junit"
  schema = file("./bq_junit_table_schema.json")
  description = "JUnitの生データ蓄積用のTable。参照は取り回しやすいようにViewの方を使うこと"

  time_partitioning {
    type = "DAY"
    field = "created"
  }
}

resource "google_bigquery_table" "junit" {
  dataset_id = google_bigquery_dataset.default.dataset_id
  table_id   = "junit_view"
  description = "参照用のView"
  view {
    query = "SELECT * FROM `${var.project_id}.${google_bigquery_dataset.default.dataset_id}.${google_bigquery_table.raw_junit.table_id}`"
    use_legacy_sql = false
  }
}

# Jobデータ用
resource "google_bigquery_table" "raw_job" {
  dataset_id = google_bigquery_dataset.default.dataset_id
  table_id   = "job"
  schema = file("./common_partition_by_created.json")
  description = "Jobの生データ蓄積用のTable。参照は取り回しやすいようにViewの方を使うこと"

  time_partitioning {
    type = "DAY"
    field = "created"
  }
}

resource "google_bigquery_table" "job" {
  dataset_id = google_bigquery_dataset.default.dataset_id
  table_id   = "job_view"
  description = "参照用のView"
  view {
    query = "SELECT * FROM `${var.project_id}.${google_bigquery_dataset.default.dataset_id}.${google_bigquery_table.raw_job.table_id}`"
    use_legacy_sql = false
  }
}
