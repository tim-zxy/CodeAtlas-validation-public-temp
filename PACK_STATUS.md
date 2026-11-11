# Controlled PACK status

Run43005700469 at control3c3f406/source79da401 failed before profile adoption or original PACK Create. Frozen reader build, fixed asset download and seed/tool verification completed. The wrapper rejected valid empty stderr members during payload mapping; no numeric profile was adopted, no package was created or uploaded. Target asset is absent. Final process cleanup receipt was not reached; do not claim SETTLED for this attempt. Original406 evidence and old release assets are unchanged.

Offline diagnosis reproduced the exact failing assertion on the pinned original inventories:200 zero-byte stderr files. The original frozen pack contract permits nonnegative byte counts. The isolated wrapper fix changes only >0 to >=0 and adds an empty-stderr regression; negative counts, path, alias, size and SHA checks remain. Regression RED beforefix, four tests GREEN afterward; real full input metadata maps5577 unique members,954695422bytes, including154 original license members. No sampling or PACK was run by these checks.

This commit prepares the fix only. Do not rerun workflow automatically. Any new approved recovery must use a new hosted owner, preserve run43005700469, and keep the original once-only Create/no retry boundary. actual22, production installation and CI-reference changes remain outside scope.
