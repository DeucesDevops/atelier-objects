# Network

VPC with public and private subnets in two or three availability zones, an internet gateway, and NAT so private nodes can reach ECR and other AWS APIs.

Subnet tags tell the AWS Load Balancer Controller where to place load balancers:

- Public subnets: `kubernetes.io/role/elb=1`
- Private subnets: `kubernetes.io/role/internal-elb=1` and `karpenter.sh/discovery=<name>`

Both tiers carry `kubernetes.io/cluster/<name>=shared`. The cluster and its nodes use the private subnets. `single_nat_gateway` is true in dev and false in production.

Flow logs go to CloudWatch with a customer-managed key and a one-year retention.
