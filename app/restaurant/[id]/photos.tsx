import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Dimensions, FlatList, View } from 'react-native';

import { Screen, ScreenHeader, SmartImage } from '@/components/ui';
import { useRestaurant } from '@/hooks/useRestaurants';
import { useTheme } from '@/theme';

const COLUMNS = 2;

export default function PhotosScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: restaurant } = useRestaurant(id);

  const size =
    (Dimensions.get('window').width - theme.screenGutter * 2 - theme.spacing.sm) / COLUMNS;

  return (
    <Screen>
      <ScreenHeader title={restaurant?.name ?? 'Photos'} subtitle="Photos" />

      <FlatList
        style={{ flex: 1 }}
        data={restaurant?.images ?? []}
        keyExtractor={(uri) => uri}
        numColumns={COLUMNS}
        columnWrapperStyle={{ gap: theme.spacing.sm }}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View>
            <SmartImage
              uri={item}
              fallbackText={restaurant?.name ?? 'Mesa'}
              accessibilityLabel={`Photo ${index + 1}`}
              style={{ width: size, height: size, borderRadius: theme.radius.md }}
            />
          </View>
        )}
      />
    </Screen>
  );
}
