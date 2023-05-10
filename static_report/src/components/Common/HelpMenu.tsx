import { IconButton, MenuDivider } from '@chakra-ui/react';
import { Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import {
  FaRegQuestionCircle,
  FaGithub,
  FaDiscord,
  FaRegCommentDots,
  FaBook,
} from 'react-icons/fa';

// Define Props
type Props = {
  githubLink?: string;
  discordLink?: string;
  docLink?: string;
  feedbackLink?: string;
};

export const FeedbackLinkFromLocalReport =
  'https://docs.google.com/forms/d/e/1FAIpQLSe0J8qC78lqMVxSAJFPub6QXx2NcVY8WLvIVEGthOeQcJHxFQ/viewform?usp=pp_url&entry.2024961102=PipeRider+Local+Reports';
export const FeedbackLinkFromCloud =
  'https://docs.google.com/forms/d/e/1FAIpQLSe0J8qC78lqMVxSAJFPub6QXx2NcVY8WLvIVEGthOeQcJHxFQ/viewform?usp=pp_url&entry.2024961102=PipeRider+Cloud';

export function HelpMenu({
  githubLink = 'https://github.com/InfuseAI/piperider',
  discordLink = 'https://discord.gg/328QcXnkKD',
  docLink = 'https://docs.piperider.io/',
  feedbackLink = FeedbackLinkFromLocalReport,
}: Props) {
  return (
    <Menu>
      <MenuButton
        as={IconButton}
        icon={<FaRegQuestionCircle />}
        backgroundColor="transparent"
      ></MenuButton>
      <MenuList>
        <MenuItem
          as="a"
          href={githubLink}
          target="_blank"
          rel="noopener noreferrer"
          icon={<FaGithub />}
        >
          Github
        </MenuItem>
        <MenuItem
          as="a"
          href={discordLink}
          target="_blank"
          rel="noopener noreferrer"
          icon={<FaDiscord />}
        >
          Discord
        </MenuItem>
        <MenuDivider />
        <MenuItem
          as="a"
          href={docLink}
          target="_blank"
          rel="noopener noreferrer"
          icon={<FaBook />}
        >
          Documentation
        </MenuItem>
        <MenuItem
          as="a"
          href={feedbackLink}
          target="_blank"
          rel="noopener noreferrer"
          icon={<FaRegCommentDots />}
        >
          Feedback
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
