# echo-breaker

Run backend/get_survey_and_topic.py to run pipeline of sampling YouGov topic, get link, download survey PDF file, parse PDF file to get all survey questions and response breakdown by party ID. Final PDF file with all questions and response breakdown by party ID saved in survey_res_csv directory. 

File structure:
In survey_metadata directory, each topic's survey is in its own subdirectory (named by topic_id), within a topic's survey subdirectory, ground_truth.json is the overall info. There can be one or more tweet images, json file of the same name as image contains ground truth values. 

Components:
1. (Async) run get_survey_and_topic.py to sample, download, and parse survey, save as csv.
2. (Async) run link_survey_q_post.py to sample survey question from survey results, save associated ground truth to json file (file name is topic id plus question number)
3. (Async) sample survey question, get and save appropriate social media post, save as image, also save corresponding ground truth.
4. (Sync) when running app, fetch random social media post and corresponding ground truth etc. 