# Security Considerations

Building trust requires careful handling of permissions, signing, and LM emulation. This note lists security best practices for the benchmark wizard.

## 1. Code Signing & Distribution
* Sign all executables, DLLs, and automation scripts with an NN-issued certificate.
* Use MSIX installer or signed MSI to reduce SmartScreen warnings.
* Provide SHA256 hashes for downloads on internal portal.

## 2. Permissions
* Run wizard with standard user privileges by default.
* Request elevation only when absolutely necessary (e.g., installing PresentMon globally).
* Store settings under `%ProgramData%/GSProBenchmark` with ACLs granting read/write to local users running the wizard.

## 3. Launch Monitor Emulation Safeguards
* Clearly label the LM emulator as “virtual device” and ensure it only binds to localhost.
* Avoid spoofing actual LM serial numbers; use NN-specific identifiers.
* Provide an “LM emulator off” toggle so real hardware can be used instead.

## 4. Network Operations
* Force HTTPS for downloads/uploads; ship CA bundle if needed.
* Validate TLS certificates to prevent MITM.
* Respect Windows firewall policies; document required outbound endpoints.

## 5. Data Handling
* Sanitize logs; avoid writing personally identifiable information.
* Encrypt stored consent tokens or API keys using DPAPI.
* Implement secure deletion for temporary files after network tests.

## 6. Automation Scripts
* Review AutoHotkey/PowerShell scripts for injection risks.
* Don't ship scripts that can execute arbitrary commands; scope them to GSPro control only.
* Provide clear messaging when automation is about to control mouse/keyboard.

## 7. Dependency Updates
* Track PresentMon, WinUI, and other third-party components for security advisories.
* Run dependency scanners (e.g., GitHub Dependabot) in the repo.

## 8. Incident Response
* Maintain contact info for reporting security issues.
* If telemetry indicates suspicious activity, disable uploads until reviewed.
