output "vpc_id" {
  description = "VPC id."
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "VPC CIDR."
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet ids, tagged for internet-facing load balancers."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet ids, tagged for internal load balancers and Karpenter."
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  description = "NAT gateway ids."
  value       = aws_nat_gateway.this[*].id
}

output "availability_zones" {
  description = "Availability zones in use."
  value       = local.azs
}
