import { Box, Flex, Text, Link, Image, Divider } from '@chakra-ui/react';

export function Footer() {
  return (
    <Flex gap={8} my={8}>
      <Flex gap={3}>
        <Flex alignItems="center" gap={3}>
          <Image
            src="GitHub/GitHub-Logo.svg"
            width={6}
            height={6}
            alt="GitHub Logo"
          />
          <Link
            href="https://github.com/InfuseAI/piperider"
            isExternal
            _hover={{ textDecoration: 'none' }}
          >
            <Text color="gray.700">GitHub</Text>
          </Link>
        </Flex>

        <Box>
          <Divider orientation="vertical" />
        </Box>

        <Flex alignItems="center" gap={3}>
          <Image
            src="Discord/Discord-Logo.svg"
            width={6}
            height={6}
            alt="Discord Logo"
          />
          <Link
            href="https://discord.com/invite/CrAxQznedH"
            isExternal
            _hover={{ textDecoration: 'none' }}
          >
            <Text color="gray.700">Discord</Text>
          </Link>
        </Flex>
      </Flex>
    </Flex>
  );
}
