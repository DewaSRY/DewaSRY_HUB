# --- hub-deploy Command document (§8.2, I6) ---
# The only command CI can run on the instance. The strict patterns mean a leaked role still cannot
# inject shell commands.

resource "aws_ssm_document" "hub_deploy" {
  name            = "hub-deploy"
  document_type   = "Command"
  document_format = "YAML"

  content = yamlencode({
    schemaVersion = "2.2"
    description   = "Blue/green deploy of the hub API image by digest (ADR-007 §8)."
    parameters = {
      Digest = {
        type           = "String"
        description    = "Image digest in ${var.ecr_repository_name}, sha256:<64 hex>"
        allowedPattern = "^sha256:[0-9a-f]{64}$"
      }
      Revision = {
        type           = "String"
        description    = "Full git commit sha (for logs and the pre-deploy dump name)"
        allowedPattern = "^[0-9a-f]{40}$"
      }
    }
    mainSteps = [
      {
        action = "aws:runShellScript"
        name   = "deploy"
        inputs = {
          timeoutSeconds = "600"
          runCommand     = ["/opt/hub/deploy.sh \"{{ Digest }}\" \"{{ Revision }}\""]
        }
      },
    ]
  })
}
