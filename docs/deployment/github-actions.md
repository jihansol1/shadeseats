# GitHub Actions Deployment Setup

ShadeSeats deploys to AWS with GitHub Actions, Amazon S3, and CloudFront.

The workflow lives at:

```text
.github/workflows/deploy.yml
```

It runs when code is pushed to `main` and can also be run manually from the GitHub Actions tab.

## What The Workflow Does

1. Checks out the repository.
2. Sets up Node.js.
3. Runs `npm run verify`.
4. Assumes an AWS IAM role with GitHub OIDC.
5. Syncs static app files to S3.
6. Invalidates the CloudFront cache.

## One-Time AWS Setup

The workflow expects this AWS role to exist:

```text
arn:aws:iam::584903217072:role/shadeseats-static-site-deploy
```

The role should trust only this GitHub repository:

```text
jihansol1/shadeseats
```

and only the `main` branch:

```text
repo:jihansol1/shadeseats:ref:refs/heads/main
```

## Create The GitHub OIDC Provider

First check if the GitHub OIDC provider already exists:

```bash
aws iam list-open-id-connect-providers --profile shadeseats-5849
```

If there is no provider for `token.actions.githubusercontent.com`, create it:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --profile shadeseats-5849
```

## Create The Trust Policy

Create a local file named `/tmp/shadeseats-github-actions-trust.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::584903217072:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:jihansol1/shadeseats:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Then create the role:

```bash
aws iam create-role \
  --role-name shadeseats-static-site-deploy \
  --assume-role-policy-document file:///tmp/shadeseats-github-actions-trust.json \
  --profile shadeseats-5849
```

## Create The Permissions Policy

Create a local file named `/tmp/shadeseats-github-actions-permissions.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DeployStaticSiteToS3",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::shadeseats-hansolji"
    },
    {
      "Sid": "ManageStaticSiteObjects",
      "Effect": "Allow",
      "Action": [
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::shadeseats-hansolji/*"
    },
    {
      "Sid": "InvalidateCloudFront",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::584903217072:distribution/E2XWJ9R2X5RS86"
    }
  ]
}
```

Attach the policy to the role:

```bash
aws iam put-role-policy \
  --role-name shadeseats-static-site-deploy \
  --policy-name shadeseats-static-site-deploy \
  --policy-document file:///tmp/shadeseats-github-actions-permissions.json \
  --profile shadeseats-5849
```

## Test The Workflow

1. Commit this branch.
2. Push it to GitHub.
3. Open the pull request.
4. Merge into `main`.
5. Go to GitHub -> Actions -> Deploy to AWS.
6. Confirm the workflow succeeds.
7. Open the CloudFront URL:

```text
https://d25wrpmoj90nsq.cloudfront.net
```
