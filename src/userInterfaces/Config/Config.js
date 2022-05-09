import React from 'react';
import { PrimaryButton, WarningButton, Card, Link, Notice, TextInput } from '@hummhive/ui-elements';
import Select from 'react-select'
import { Container, Spacer, CardContainer, Row } from './styled';

export default function Config({
connectSendGridAccount,
name,
email,
country,
city,
checkSenders,
confirmSenders,
connectionConfig,
syncMembers,
createSender,
sendersList,
isLoading,
setSubdomain,
deleteUsers,
setName,
setCountry,
setEmail,
setAddress,
address,
setCity,
options
}) {

  const handleRemove = async () => {
    if (confirm('Are you sure you want to delete this email?')) {
      deleteUsers();
    }
  };

  if (!connectionConfig?.content.stepCompleted)
    return (
      <Container>
        <h3>Step 1: Connect your Hive on Twilio SendGrid with Honeyworks Notify</h3>
        <span>This Cell allows you to send newsletters using Twilio SendGrid</span>
             <Spacer height={24} />
            <Row>
          <PrimaryButton loading={isLoading} onClick={() => connectSendGridAccount()}>
            Setup
          </PrimaryButton>
          </Row>
      </Container>
    );

if (connectionConfig?.content.stepCompleted === 1)
  return (
    <Container>
      <h3>Step 2: Choose a Sender Identifier</h3>
      <span>You're required to include your contact information, including a physical mailing address, inside every promotional email you send in order to comply with anti-spam laws such as CAN-SPAM and CASL</span>
    <Spacer height={20} />
      <Row>
    <span>From Name:</span>
    </Row>
  <Row>
    <TextInput
      placeholder={name}
      value={name}
      type='text'
      onChange={(e) => setName(e.target.value)}
    />
  </Row>
     <Spacer height={10} />
      <Row>
    <span>From Email:</span>
    </Row>
  <Row>
    <TextInput
      className="email-label"
      value={email}
      type='text'
      onChange={(e) => setEmail(e.target.value).toLowerCase()}
    />
  <span style={{marginTop: "5px"}}>@em289.honeyworks.earth</span>
  </Row>
     <Spacer height={10} />
  <Row>
  <span>Country:</span>
  </Row>
  <Row>
    <Select placeholder="Type to search..." className="select-component" openMenuOnClick={false} isSearchable options={options} value={country} onChange={(e) => setCountry(e)} />
  </Row>
     <Spacer height={10} />
  <Row>
    <span>Address:</span>
    </Row>
    <Row>
    <TextInput
      placeholder={address}
      value={address}
      type='text'
      onChange={(e) => setAddress(e.target.value)}
    />
    </Row>
         <Spacer height={10} />
    <Row>
<span>City:</span>
</Row>
<Row>
<TextInput
  placeholder={city}
  value={city}
  type='text'
  onChange={(e) => setCity(e.target.value)}
/>
</Row>

  <Spacer height={24} />
      <Row>
    <PrimaryButton loading={isLoading} onClick={() => createSender()}>
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
        {isLoading ? "Syncing Hive Members with Twilio SendGrid" : "Sync Hive Members with Twilio SendGrid"}
      </PrimaryButton>
    </Row>
      <Spacer height={12} />
      <Row>
      <WarningButton onClick={() => deleteUsers()}>Delete Account</WarningButton>
    </Row>
      </Container>
    );
};
