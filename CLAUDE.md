- for this project, the code should be changed in this host, but the deployment, database and running of the app needs to happen in the raspberry (using ssh pi)
- **IMPORTANT**: Whenever there is a new feature or code change, read the deploy-to-pi skill to know how to deploy. Always commit before deploying.
- Images on Pi are at ~/learn-language/data/images/
- Audio on Pi is at ~/learn-language/data/audio/

## Available Skills

- **add-word**: Add a single Arabic word to the flashcard system
- **import-vocabulary**: Import vocabulary from Word documents (.docx)
- **generate-card-image**: Download an image for a vocabulary card using Unsplash
- **download-playaling-audio**: Download MSA audio pronunciation from Playaling
- **deploy-to-pi**: Deploy code changes to the Raspberry Pi
- when I ask to make a change, check if you can use the API in https://learn.rocksbythesea.uk using the bearer token EGfYvc4Fm4vzD4QBqouEyLoW