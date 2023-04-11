import webbrowser


def _send_feedback(url):
    try:
        webbrowser.open(url, new=2)
    except webbrowser.Error:
        print(f"The feedback form: {url}")


class Feedback:

    @staticmethod
    def exec():
        url = "https://docs.google.com/forms/d/e/1FAIpQLSe0J8qC78lqMVxSAJFPub6QXx2NcVY8WLvIVEGthOeQcJHxFQ/viewform?usp=pp_url&entry.2024961102=PipeRider+CLI"
        _send_feedback(url)

    @staticmethod
    def suggest_datasource(data_source_name):
        url = "https://docs.google.com/forms/d/e/1FAIpQLSe0J8qC78lqMVxSAJFPub6QXx2NcVY8WLvIVEGthOeQcJHxFQ/viewform?usp=pp_url&entry.2024961102=PipeRider+CLI&entry.326955045=I+suggest+supporting+a+data+source+for+%5Bfill+me%5D"
        _send_feedback(url)
        pass
