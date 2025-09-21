# Variables
$AccessKey = "admin"
$SecretKey = "admin123"
$Bucket = "marketplace"
$MinioServer = "localhost:9000"

# Leer el archivo XML
$CorsFile = "C:\Users\Admin\Documents\Marketplace\marketplace_full_v5\cors.xml"
$CorsBody = Get-Content $CorsFile -Raw

# Fecha en formato ISO8601
$AmzDate = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$DateStamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd")

# Región por defecto en MinIO
$Region = "us-east-1"

# Canonical request
$Method = "PUT"
$Service = "s3"
$RequestType = "aws4_request"
$Algorithm = "AWS4-HMAC-SHA256"
$ContentType = "application/xml"

$CanonicalUri = "/$Bucket"
$CanonicalQuery = "cors"
$SignedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date"

# Hash del cuerpo
$PayloadHash = (New-Object System.Security.Cryptography.SHA256Managed).ComputeHash([System.Text.Encoding]::UTF8.GetBytes($CorsBody))
$PayloadHashHex = -join ($PayloadHash | ForEach-Object { "{0:x2}" -f $_ })

# Canonical request string
$CanonicalRequest = "$Method`n/$Bucket`ncors`ncontent-type:$ContentType`nhost:$MinioServer`nx-amz-content-sha256:$PayloadHashHex`nx-amz-date:$AmzDate`n`n$SignedHeaders`n$PayloadHashHex"

# String to sign
$CredentialScope = "$DateStamp/$Region/$Service/$RequestType"
$CanonicalRequestHash = (New-Object System.Security.Cryptography.SHA256Managed).ComputeHash([System.Text.Encoding]::UTF8.GetBytes($CanonicalRequest))
$CanonicalRequestHashHex = -join ($CanonicalRequestHash | ForEach-Object { "{0:x2}" -f $_ })
$StringToSign = "$Algorithm`n$AmzDate`n$CredentialScope`n$CanonicalRequestHashHex"

# Función para firmar con HMAC
function HmacSHA256([byte[]] $Key, [string] $Data) {
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $Key
    return $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($Data))
}

# Firmar
$kDate = HmacSHA256 ([Text.Encoding]::UTF8.GetBytes("AWS4$SecretKey")) $DateStamp
$kRegion = HmacSHA256 $kDate $Region
$kService = HmacSHA256 $kRegion $Service
$kSigning = HmacSHA256 $kService $RequestType
$SignatureBytes = HmacSHA256 $kSigning $StringToSign
$Signature = -join ($SignatureBytes | ForEach-Object { "{0:x2}" -f $_ })

# Autorización
$Authorization = "$Algorithm Credential=$AccessKey/$CredentialScope, SignedHeaders=$SignedHeaders, Signature=$Signature"

# Enviar request
Invoke-WebRequest -Uri "http://$MinioServer/$Bucket?cors" `
  -Method PUT `
  -Body $CorsBody `
  -ContentType $ContentType `
  -Headers @{
    "Authorization" = $Authorization
    "x-amz-content-sha256" = $PayloadHashHex
    "x-amz-date" = $AmzDate
  } -Verbose
