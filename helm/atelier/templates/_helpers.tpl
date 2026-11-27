{{- define "atelier.labels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: atelier
app.kubernetes.io/part-of: atelier
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
app.kubernetes.io/version: {{ .root.Chart.AppVersion | quote }}
{{- end -}}

{{- define "atelier.selector" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: atelier
{{- end -}}

{{- define "atelier.image" -}}
{{- $repo := printf "%s%s" .root.Values.namePrefix .name -}}
{{- if .root.Values.image.registry -}}
{{- printf "%s/%s:%s" .root.Values.image.registry $repo .root.Values.image.tag -}}
{{- else -}}
{{- printf "%s:%s" $repo .root.Values.image.tag -}}
{{- end -}}
{{- end -}}

{{- define "atelier.volumeName" -}}
{{- regexReplaceAll "[^a-z0-9]+" . "-" | trimAll "-" -}}
{{- end -}}

{{- define "atelier.floor" -}}
{{- $floor := int .svc.replicas -}}
{{- if and .svc.hpa .svc.hpa.enabled -}}
{{- $floor = int .svc.hpa.minReplicas -}}
{{- end -}}
{{- $floor -}}
{{- end -}}
