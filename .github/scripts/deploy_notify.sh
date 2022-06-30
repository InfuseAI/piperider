#!/bin/bash
label_require_qa=575
SHORTCUT_WORKFLOW_STATE_QA='500000086'
SHORTCUT_WORKFLOW_STATE_COMPLETE='500000011'
SHORTCUT_WORKFLOW_STATE_READY_TO_DEPLOY='500000009'
SHORTCUT_API_TOKEN=${SHORTCUT_API_TOKEN:-$CH_TOKEN}
CURRENT_SHA=${GITHUB_SHA:-$(git rev-parse HEAD)}
PIPERIDER_VERSION=${PIPERIDER_VERSION:-$1}

if [ -z "$CURRENT_SHA" ]; then
  echo "No CURRENT_SHA skipped."
  exit 0
fi

function get_previous_sha() {
    curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/infuseai/piperider/actions/workflows/nightly.yaml/runs -s | jq -r '[.workflow_runs[] | select(.event == "schedule" and .conclusion == "success")] | .[0] | .head_sha'
}

function get_pr_number_from_message() {
    message=$1
    pr_number=$(echo $message | grep -o '#[0-9]*' | grep -o '[0-9]*')
}

function get_pr_ref_by_number() {
  pr_number=$1
  curl -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/infuseai/piperider/pulls/$pr_number" -s | jq -r '.head.ref'
}

function get_shortcut_story_details() {
  id=$1
  curl -s -X GET \
  -H "Content-Type: application/json" \
  -L "https://api.app.shortcut.com/api/v3/stories/$id?token=$SHORTCUT_API_TOKEN"
}

function move_shortcut_story() {
  id=$1
  to_state=$2
  curl -s -X PUT \
    -H "Content-Type: application/json" \
    -d "{ \"workflow_state_id\": $to_state }" \
    -L "https://api.app.shortcut.com/api/v3/stories/$id?token=$SHORTCUT_API_TOKEN"
  echo "[sc-$id] Move to: $to_state"
}


PREV_SHA=$(get_previous_sha)

echo "MERGES: $PREV_SHA $CURRENT_SHA"
git log --oneline $PREV_SHA..$CURRENT_SHA

merges=$(git log --oneline $PREV_SHA..$CURRENT_SHA | cut -c 8- | grep '#\d*' | uniq)
notes=":chai_dog::chai_dog::chai_dog:*Release Notes*:chai_dog::chai_dog::chai_dog: \n\n :piperider: :conga_parrot:  \`$PIPERIDER_VERSION\` :conga_parrot: :piperider: \n :git: \`$PREV_SHA..$CURRENT_SHA\` \n \n *Shortcut Stories:*"

pattern=".*sc-([0-9]+).*"
moved_qa=""
moved_complete=""
skipped=""

IFS=$'\n'
for str in ${merges[@]}; do
  result=""
  storyid=''

  if [[ $str =~ $pattern ]]; then
    storyid=${BASH_REMATCH[1]}
  else
    pr_number=$(get_pr_number_from_message $str)
    pr_ref=$(get_pr_ref_by_number $pr_number)
    if [[ $pr_ref =~ $pattern ]]; then
      storyid=${BASH_REMATCH[1]}
    fi
  fi

  if [ "$storyid" != '' ]; then
    # Get story details
    story_data=$(get_shortcut_story_details $storyid)
    title=$(echo $story_data | jq -r .name)
    result="$title <https://app.shortcut.com/infuseai/story/$storyid|sc-$storyid>"
    need_qa=$(echo $story_data | jq -r ".labels | map(select(.id == $label_require_qa)) | .[0].name" )
    current_workflow_state=$(echo $story_data | jq -r ".workflow_state_id")
    echo "[sc-$storyid] Title: $title State: $current_workflow_state Need QA: $need_qa"

    # Only move the story in Ready to Deploy state
    if [ "$current_workflow_state" == "$SHORTCUT_WORKFLOW_STATE_READY_TO_DEPLOY" ]; then
      if [ "$need_qa" = "null" ]; then
        moved_complete="$moved_complete \n - \`Complete\` $result"
        # Move to complete
        move_shortcut_story $storyid $SHORTCUT_WORKFLOW_STATE_COMPLETE
      else
        moved_qa="$moved_qa \n - \`Need QA\` $result"
        # Move to qa
        move_shortcut_story $storyid $SHORTCUT_WORKFLOW_STATE_QA
      fi
    else
      skipped="$skipped \n - \`Others\` $result"
      echo "[sc-$storyid] Skipped: $current_workflow_state"
    fi
  fi
done

notes="$notes \n $moved_qa \n\n $moved_complete \n\n $skipped \n\n All tasks status updated \n Enjoy! :fingerloooove:"

curl -X POST --data-urlencode "payload={\"channel\": \"$SLACK_CHANNEL\", \"username\": \"Arsonists\", \"text\": \"$notes\", \"icon_emoji\": \":infuseai:\"}" $SLACK_API_TOKEN
