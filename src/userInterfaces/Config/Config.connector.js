import React from 'react';
import { useApi } from '@hummhive/api-react-utils';
import { useRecoilValueLoadable } from 'recoil';
import { withActiveHive } from '@hummhive/state/hive';
import {
  useUpdateConnectionConfig,
  withConnectionConfig,
} from '@hummhive/state/connection';
import propsMapper from '../../utils/propsMapper';
import Config from './Config';
import packageJson from '../../../package.json';

const path = window.require('path');
const connectionId = 'honeyworks-cloud-messaging';
const mapProps = () => {
  const honeyworksSendGridAPI = useApi(Symbol.for('messaging'), connectionId);
  const notificationsAPI = useApi(Symbol.for('notification'));
  const hive = useRecoilValueLoadable(withActiveHive).valueMaybe();
  const updateconnectionConfig = useUpdateConnectionConfig();
  const connectionConfig = useRecoilValueLoadable(
    withConnectionConfig(connectionId)
  ).valueMaybe();
  const [apiKeyIdInput, setKeyApiIdInput] = React.useState('');
  const [jobId, setJobId] = React.useState(null);
  const [apiKeyInput, setKeyApiInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [sendersList, setSendersList] = React.useState(null);

  React.useEffect(() => {
    if (connectionConfig && connectionConfig?.content.jobId !== null)
      syncStatus();
  }, [connectionConfig]);

  const connectSendGridAccount = async () => {
    try {
      setIsLoading(true);
      const data = await honeyworksSendGridAPI.setup(apiKeyIdInput, apiKeyInput);
      const senders = await honeyworksSendGridAPI.checkVerifiedSenders();
      const supressionGroup = await honeyworksSendGridAPI.createSuppressionGroup();
      const config = {
        api_key_id: data.api_key_id,
        domain_verified: senders.results.domain_verified,
        sender_verified: senders.results.sender_verified,
        members_synced: false,
        verified_sender_id: null,
        verified_sender_email: null,
        unsubscribe_group_id: supressionGroup.id,
        jobId: null,
        stepCompleted: 1
      };
      await updateconnectionConfig(connectionId, config);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      notificationsAPI.add(err, 'error');
    }
  };

  const checkSenders = async () => {
    try {
      const data = await honeyworksSendGridAPI.checkVerifiedSenders();
      await updateconnectionConfig(connectionId, {
        ...connectionConfig.content,
        domain_verified: data.results.domain_verified,
        sender_verified: data.results.sender_verified,
      });
    } catch (err) {
      notificationsAPI.add(err, 'error');
    }
  };

  const confirmSenders = async () => {
    try {
      setIsLoading(true);
      const data = await honeyworksSendGridAPI.checkVerifiedSenders();
      const getSenders = await honeyworksSendGridAPI.getVerifiedSenders();
      const getVerifiedSender = getSenders.results.find(sender => sender.verified === true);
      await updateconnectionConfig(connectionId, {
        ...connectionConfig.content,
        verified_sender_id: getVerifiedSender.id,
        verified_sender_email: getVerifiedSender.from_email,
        stepCompleted: 2
      });
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      notificationsAPI.add(err, 'error');
    }
  };

  const syncMembers = async () => {
    try {
      const getJob = await honeyworksSendGridAPI.syncContacts();
      if(!getJob)
      return notificationsAPI.add('No Hive Members with Email Address to Sync!', 'alert');
      await updateconnectionConfig(connectionId, {
        ...connectionConfig.content,
        members_synced: false,
        jobId: getJob.job_id
      });
    } catch (err) {
      notificationsAPI.add(err, 'error');
    }
  };

  const syncStatus = async () => {
    try {
      let interval;
      watchSyncStatusInterval();
       async function watchSyncStatusInterval() {
      const jobStage = await honeyworksSendGridAPI.contactStatus(connectionConfig.content.jobId);
      if (!interval){
          interval = setInterval(watchSyncStatusInterval, 5000);
          setIsLoading(true);
       } else if (jobStage.status === "completed") {
           await updateconnectionConfig(connectionId, {
             ...connectionConfig.content,
             members_synced: true,
             jobId: null
           });
           setIsLoading(false);
           clearInterval(interval);
    }
  }
    } catch (err) {
      notificationsAPI.add(err, 'error');
    }
  };

  return {
    connectSendGridAccount,
    checkSenders,
    apiKeyIdInput,
    isLoading,
    confirmSenders,
    connectionConfig,
    sendersList,
    syncStatus,
    syncMembers,
    apiKeyInput,
    setKeyApiIdInput,
    setKeyApiInput
  };
};

export default propsMapper(mapProps)(Config);
