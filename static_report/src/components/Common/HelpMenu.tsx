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

export function HelpMenu({
  githubLink = 'https://github.com/InfuseAI/piperider',
  discordLink = 'https://discord.gg/328QcXnkKD',
  docLink = 'https://docs.piperider.io/',
  feedbackLink = 'https://forms.gle/zyf7UZdnZRCJWQNd9',
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
