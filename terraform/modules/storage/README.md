# Storage

Private S3 buckets for backups and assets, plus a log bucket that receives their access logs. Every bucket is versioned, encrypted with a customer-managed key, and closed to public access. Names include the account id.

The assets bucket is not a public website origin. Catalog images should be served by the application, or by a later CloudFront distribution that is outside this module.

No object contents and no credentials are created here.
