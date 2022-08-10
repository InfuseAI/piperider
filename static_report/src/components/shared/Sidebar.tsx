import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  Text,
  Modal,
  ModalHeader,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Textarea,
  Heading,
  UnorderedList,
  ListItem,
  Input,
  FormControl,
  FormLabel,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { FiDatabase, FiMessageSquare } from 'react-icons/fi';
import { useState } from 'react';

type Feedback = {
  user_id: string;
  message: string;
  email?: string;
  version?: string;
  score?: number;
  page?: string;
  misc?: string;
};

async function sendFeedback(data: Feedback): Promise<boolean> {
  try {
    await fetch(
      `https://api.aws.piperider.io/v1/feedback?token=371aa67a-a6eb-44cc-9d02-4a05810f24ac`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      },
    ).then((res) => res.json());

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export function Sidebar() {
  const toast = useToast();
  const modal = useDisclosure();
  const [feedback, setFeedback] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  return (
    <Flex
      height="100vh"
      position="sticky"
      top={0}
      direction="column"
      bgColor="gray.100"
      alignItems="center"
      justifyContent="space-between"
      p={4}
    >
      <Flex
        alignItems="center"
        direction="column"
        bgColor="white"
        borderRadius="md"
        cursor="pointer"
        color="piperider.500"
        px={4}
        py={2}
      >
        <Icon as={FiDatabase} boxSize={6} />
        <Text fontSize="sm">Data</Text>
      </Flex>

      <Box>
        <Divider borderColor="black" my={4} />
        <Flex
          data-cy="open-feedback-modal"
          alignItems="center"
          direction="column"
          cursor="pointer"
          p={2}
          onClick={() => modal.onOpen()}
        >
          <Icon as={FiMessageSquare} boxSize={6} />
          <Text fontSize="xs">Feedback</Text>
        </Flex>
      </Box>

      <Modal {...modal} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Send feedback to PipeRider</ModalHeader>
          <ModalCloseButton />
          <ModalBody data-cy="feedback-modal">
            <Flex
              id="feedback-form"
              as="form"
              flexDirection="column"
              gap={6}
              onSubmit={async (event) => {
                event.preventDefault();
                setIsSending(true);

                const isSuccessful = await sendFeedback({
                  user_id: window.PIPERIDER_METADATA.amplitude_user_id,
                  version: window.PIPERIDER_METADATA.version,
                  message: feedback,
                  email: userEmail !== '' ? userEmail : undefined,
                });

                if (isSuccessful) {
                  toast({
                    status: 'success',
                    description: 'Sent, Thank you!❤️',
                    position: 'bottom-right',
                    duration: 3000,
                    isClosable: true,
                  });
                } else {
                  toast({
                    status: 'error',
                    description:
                      'Something went wrong, please try again later.😢',
                    position: 'bottom-right',
                    duration: 3000,
                    isClosable: true,
                  });
                }

                setIsSending(false);
                setFeedback('');
                setUserEmail('');
                modal.onClose();
              }}
            >
              <FormControl>
                <Textarea
                  placeholder="We are always improving and would love to hear your thoughts!"
                  value={feedback}
                  onChange={(event) => {
                    event.preventDefault();
                    setFeedback(event.target.value);
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Email (optional)</FormLabel>
                <Input
                  type="email"
                  value={userEmail}
                  placeholder="Email address (optional)"
                  onChange={(event) => {
                    setUserEmail(event.target.value);
                  }}
                />
              </FormControl>

              <Flex direction="column" gap={2}>
                <Heading size="sm">Metadata</Heading>
                <UnorderedList>
                  <ListItem>
                    Version: {window.PIPERIDER_METADATA.version}
                  </ListItem>
                </UnorderedList>
              </Flex>
            </Flex>
          </ModalBody>

          <ModalFooter>
            <Button
              data-cy="close-feedback-modal"
              mr={3}
              onClick={modal.onClose}
            >
              Close
            </Button>
            <Button
              type="submit"
              form="feedback-form"
              data-cy="send-feedback"
              colorScheme="piperider"
              isLoading={isSending}
              disabled={feedback.trim().length === 0}
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
