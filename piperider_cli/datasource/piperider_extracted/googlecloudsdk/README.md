## Partial Google Cloud SDK

The partial google-cloud-sdk was extracted from the `gcloud/lib`.

## Usage

```python
from piperider_cli.datasource.piperider_extracted.googlecloudsdk.core.config import Paths

# Get default adc with None account
default_adc_json = Paths().LegacyCredentialsAdcPath(None)
print(default_adc_json)

# Get adc with oauth email
adc_json = Paths().LegacyCredentialsAdcPath('foobar@example.com')
print(adc_json)
```

## How to get required python modules?

Run the above code and get loaded modules

```python
import sys

for k, v in sys.modules.items():
  # pick up related modules with `googlecloudsdk.*`
  print(k, v.__file__)
```

