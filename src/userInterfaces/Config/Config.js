import React from 'react';
import { PrimaryButton, SecondaryButton, Card, Link, Notice, TextInput } from '@hummhive/ui-elements';
import { Container, Spacer, CardContainer, Row } from './styled';

export default function Config({
connectSendGridAccount,
apiKeyIdInput,
checkSenders,
confirmSenders,
apiKeyInput,
connectionConfig,
syncMembers,
sendersList,
isLoading,
setKeyApiIdInput,
setKeyApiInput
}) {
  if (!connectionConfig?.content.api_key_id)
    return (
      <Container>
        <h3>Step 1: Connect your Hive with Twilio SendGrid</h3>
        <span>For starters, to use this plugin, you need a valid Sendgrid account and an API key.</span>
        <span>If you don't have a SendGrind Account,{' '}
            <Link
              target="_blank"
              href="https://sendgrid.com"
            >
              you can create one here.
            </Link>
            {' '} After that create your API Key
            <Link target="_blank" href="https://app.sendgrid.com/settings/api_keys">
            {' '} right here.
            </Link>
          </span>
        <Spacer height={24} />
        <Row>
          <TextInput
            placeholder="API Key ID"
            value={apiKeyIdInput}
            onChange={(e) => setKeyApiIdInput(e.target.value)}
          />
          </Row>
          <Spacer height={24} />
          <Row>
            <TextInput
              placeholder="API Key"
              value={apiKeyInput}
              type='password'
              onChange={(e) => setKeyApiInput(e.target.value)}
            />
            </Row>
            <Spacer height={24} />
            <span>If you need additional help you can follow
             <Link target="_blank" href="https://hostlaunch.io/docs/how-to-get-a-sendgrid-api-key/"> {' '} this tutorial</Link></span>
             <Spacer height={24} />
            <Row>
          <PrimaryButton loading={isLoading} disabled={!apiKeyInput && !apiKeyIdInput} onClick={() => connectSendGridAccount()}>
            Connect my Hive with SendGrid
              </PrimaryButton>
          </Row>
      </Container>
    );

if (connectionConfig?.content.stepCompleted === 1)
  return (
    <Container>
      <h3>Step 2: Send your first emails with Twilio SendGrid</h3>
      <span>Before sending email you’ll need to create at least one sender identity.
      If you haven't done it, you can do it <a href="https://app.sendgrid.com/guide" target="_blank">here.</a></span>
    <Spacer height={8} />
  <Row>
  <span>Sender Verified: {connectionConfig.content.sender_verified  ? "✅" : "❌"}</span>
  </Row>
  <Spacer height={8} />
  <Row>
    <span>Domain Verified: {connectionConfig.content.domain_verified ? "✅" : "❌"} {!connectionConfig.content.domain_verified && connectionConfig.content.sender_verified && (
          <i>(You can complete this step later!)</i>
    )}</span>
  </Row>
            <Spacer height={24} />
    {!connectionConfig.content.domain_verified && !connectionConfig.content.sender_verified && (
      <Row>
    <PrimaryButton loading={isLoading} onClick={() => checkSenders()}>
      Check Senders Identities
    </PrimaryButton>
  </Row>
  )}
  <Spacer height={10} />
  <Row>
    <PrimaryButton loading={isLoading} disabled={!connectionConfig.content.domain_verified && !connectionConfig.content.sender_verified} onClick={() => confirmSenders()}>
    Continue
    </PrimaryButton>
    </Row>
    </Container>
  );

  if (connectionConfig?.content.stepCompleted === 2)
    return (
      <Container>
        <strong>Your Twilio Sendgrid is now connected!</strong>
        <Row>
      <span>You are sending emails as: {connectionConfig.content.verified_sender_email}</span>
      </Row>
      <Spacer height={24} />
      <Row>
      <PrimaryButton loading={isLoading} onClick={() => syncMembers()}>
        {isLoading ? "Syncing Hive Members with SendGrid" : "Sync Hive Members with SendGrid"}
      </PrimaryButton>
    </Row>
      </Container>
    );
};
